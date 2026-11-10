/**
 * roles.ts — role packs (design §5, "Role: who the chat is";
 * E4 Part 2).
 *
 * A statement is answered according to the chat's ROLE — the
 * self's stance in the conversation. Roles are DATA, not code:
 * packs under `roles/` declaring, per role, its statement
 * strategy, its preferred relations for fact selection, its
 * follow-up policy, its decline style, its clarification
 * disposition and its memory-acknowledgement voice. Building a
 * new role is writing a pack, not patching the engine.
 *
 * The invariant the packs may never break (§5): GROUNDING
 * OUTRANKS ROLE. A role shapes selection and stance, never
 * licence — it may change HOW a decline is worded, never
 * WHETHER an unattested claim is made. Decline style differs
 * between packs; decline honesty may not.
 *
 * Selection: `CSKG_CHAT_ROLE`, default `assistant`. The pack is
 * loaded once per process (memoised); `CSKG_CHAT_ROLES_DIR`
 * overrides the pack directory (tests and judgement scripts).
 * An unknown role name is a configuration error and throws —
 * silently running as the wrong self would be worse than not
 * running. The pack ships in the workspace (awareness loads it,
 * §2) and Context composes its dispositions into the operative
 * context each turn.
 */
import * as fs from "fs";
import * as path from "path";

/** How a role meets a statement (§5, S7). */
export type StatementStrategy = "acknowledge-and-offer" | "react-and-share";

/** How readily a role escalates ambiguity to a question (§5). */
export type ClarificationDisposition = "ready" | "moderate" | "sparing";

/**
 * How a decline is worded. "named-missing" names the missing
 * relation and what was searched (the assistant's honesty);
 * "plain" says it doesn't know, warmly and briefly. Both are
 * bound by the same empty set — the style is the only
 * difference.
 */
export type DeclineStyle = "named-missing" | "plain";

/** Whether a class of statement earns a follow-up question. */
export type FollowupStance = "follow-up" | "none";

export interface RolePack {
  id: string;
  label: string;
  statementStrategy: StatementStrategy;
  /** relations solve prefers when this role selects a statement fact */
  preferredRelations: string[];
  followupPolicy: {
    schmooze: FollowupStance;
    connected: FollowupStance;
    informing: FollowupStance;
  };
  declineStyle: DeclineStyle;
  clarificationDisposition: ClarificationDisposition;
  /** the role's voice for a memory-write acknowledgement */
  memoryAck: string;
}

/** The directory packs load from: env override, else <repo>/roles. */
export function rolesDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = (env.CSKG_CHAT_ROLES_DIR ?? "").trim();
  if (override) return override;
  return path.join(__dirname, "..", "..", "..", "roles");
}

const cache = new Map<string, RolePack>();

const STATEMENT_STRATEGIES: StatementStrategy[] = [
  "acknowledge-and-offer",
  "react-and-share",
];
const DISPOSITIONS: ClarificationDisposition[] = ["ready", "moderate", "sparing"];
const DECLINE_STYLES: DeclineStyle[] = ["named-missing", "plain"];
const FOLLOWUPS: FollowupStance[] = ["follow-up", "none"];

function checked<T extends string>(value: unknown, allowed: readonly T[], field: string, id: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new Error(
      `role pack "${id}": field "${field}" must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)})`,
    );
  }
  return value as T;
}

/** Parse and validate one pack file's contents. Pure; testable. */
export function parseRolePack(json: string, source: string): RolePack {
  const raw = JSON.parse(json) as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id ? raw.id : path.basename(source, ".json");
  const follow = (raw.followupPolicy ?? {}) as Record<string, unknown>;
  const pack: RolePack = {
    id,
    label: typeof raw.label === "string" && raw.label ? raw.label : id,
    statementStrategy: checked(raw.statementStrategy, STATEMENT_STRATEGIES, "statementStrategy", id),
    preferredRelations: Array.isArray(raw.preferredRelations)
      ? raw.preferredRelations.filter((r): r is string => typeof r === "string")
      : [],
    followupPolicy: {
      schmooze: checked(follow.schmooze ?? "none", FOLLOWUPS, "followupPolicy.schmooze", id),
      connected: checked(follow.connected ?? "none", FOLLOWUPS, "followupPolicy.connected", id),
      informing: checked(follow.informing ?? "none", FOLLOWUPS, "followupPolicy.informing", id),
    },
    declineStyle: checked(raw.declineStyle, DECLINE_STYLES, "declineStyle", id),
    clarificationDisposition: checked(
      raw.clarificationDisposition, DISPOSITIONS, "clarificationDisposition", id,
    ),
    memoryAck:
      typeof raw.memoryAck === "string" && raw.memoryAck ? raw.memoryAck : "I'll remember that.",
  };
  return pack;
}

/**
 * Load the configured role pack. `CSKG_CHAT_ROLE` names it
 * (default "assistant"); the pack file is roles/<name>.json.
 */
export function loadRolePack(env: NodeJS.ProcessEnv = process.env): RolePack {
  const name = (env.CSKG_CHAT_ROLE ?? "").trim().toLowerCase() || "assistant";
  const dir = rolesDir(env);
  const key = `${dir}::${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const file = path.join(dir, `${name}.json`);
  let json: string;
  try {
    json = fs.readFileSync(file, "utf8");
  } catch {
    throw new Error(
      `role pack "${name}" not found at ${file} — CSKG_CHAT_ROLE names a file in the roles directory`,
    );
  }
  const pack = parseRolePack(json, file);
  cache.set(key, pack);
  return pack;
}
